package com.repairflow.repair.service;

import static com.repairflow.repair.entity.RepairStatus.APPROVED;
import static com.repairflow.repair.entity.RepairStatus.CANCELLED;
import static com.repairflow.repair.entity.RepairStatus.COMPLETED;
import static com.repairflow.repair.entity.RepairStatus.DELIVERED;
import static com.repairflow.repair.entity.RepairStatus.INSPECTING;
import static com.repairflow.repair.entity.RepairStatus.RECEIVED;
import static com.repairflow.repair.entity.RepairStatus.REJECTED;
import static com.repairflow.repair.entity.RepairStatus.REPAIRING;
import static com.repairflow.repair.entity.RepairStatus.WAITING_CONFIRMATION;
import static com.repairflow.repair.entity.RepairStatus.WAITING_FOR_PARTS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.repairflow.common.exception.BusinessException;
import com.repairflow.common.exception.ErrorCode;
import com.repairflow.customer.entity.Customer;
import com.repairflow.device.entity.Device;
import com.repairflow.device.entity.DeviceType;
import com.repairflow.repair.entity.RepairOrder;
import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.repair.service.RepairStatusPolicy.Channel;
import com.repairflow.security.AuthenticatedUser;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.util.ReflectionTestUtils;

class RepairStatusPolicyTest {

    private static final AuthenticatedUser ADMIN = new AuthenticatedUser(1L, "a@x", Role.ADMIN);
    private static final AuthenticatedUser STAFF = new AuthenticatedUser(2L, "s@x", Role.STAFF);
    private static final AuthenticatedUser TECH = new AuthenticatedUser(3L, "t@x", Role.TECHNICIAN);
    private static final AuthenticatedUser OTHER_TECH = new AuthenticatedUser(4L, "t2@x", Role.TECHNICIAN);
    private static final AuthenticatedUser OWNER = new AuthenticatedUser(5L, "c@x", Role.CUSTOMER);
    private static final AuthenticatedUser OTHER_CUSTOMER = new AuthenticatedUser(6L, "c2@x", Role.CUSTOMER);

    private final RepairStatusPolicy policy = new RepairStatusPolicy();
    private RepairOrder order;

    private static User userWithId(long id, Role role) {
        User u = new User("u" + id + "@x", "h", "U" + id, null, role);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    @BeforeEach
    void setUp() {
        Customer customer = new Customer("CUS-1", "Khách", "0900000000");
        customer.setUser(userWithId(5L, Role.CUSTOMER));
        Device device = new Device(customer, "iPhone", DeviceType.PHONE);
        order = new RepairOrder("RO-1", customer, device, userWithId(2L, Role.STAFF), "Hỏng màn hình");
        order.setTechnician(userWithId(3L, Role.TECHNICIAN));
        order.setSolution("Thay màn hình");
    }

    private RepairOrder at(RepairStatus status) {
        order.setStatus(status);
        return order;
    }

    @Nested
    class Graph {

        /** Mọi cạnh hợp lệ theo docs/requirements.md §3.5. */
        static Stream<Arguments> validEdges() {
            return Stream.of(
                    Arguments.of(RECEIVED, INSPECTING), Arguments.of(RECEIVED, CANCELLED),
                    Arguments.of(INSPECTING, WAITING_CONFIRMATION), Arguments.of(INSPECTING, CANCELLED),
                    Arguments.of(WAITING_CONFIRMATION, APPROVED), Arguments.of(WAITING_CONFIRMATION, REJECTED),
                    Arguments.of(WAITING_CONFIRMATION, CANCELLED),
                    Arguments.of(REJECTED, WAITING_CONFIRMATION), Arguments.of(REJECTED, DELIVERED),
                    Arguments.of(APPROVED, REPAIRING), Arguments.of(APPROVED, WAITING_FOR_PARTS),
                    Arguments.of(WAITING_FOR_PARTS, REPAIRING), Arguments.of(WAITING_FOR_PARTS, CANCELLED),
                    Arguments.of(REPAIRING, WAITING_FOR_PARTS), Arguments.of(REPAIRING, WAITING_CONFIRMATION),
                    Arguments.of(REPAIRING, COMPLETED),
                    Arguments.of(COMPLETED, DELIVERED));
        }

        @ParameterizedTest(name = "{0} → {1} hợp lệ")
        @MethodSource("validEdges")
        void validEdgesAreAllowed(RepairStatus from, RepairStatus to) {
            assertThat(policy.isEdgeAllowed(from, to)).isTrue();
        }

        @Test
        void exactlyTheDocumentedEdgesExist() {
            long allowed = 0;
            for (RepairStatus from : RepairStatus.values()) {
                for (RepairStatus to : RepairStatus.values()) {
                    if (policy.isEdgeAllowed(from, to)) {
                        allowed++;
                    }
                }
            }
            assertThat(allowed).isEqualTo(validEdges().count()); // không có cạnh "lén" nào ngoài tài liệu
        }

        @ParameterizedTest(name = "{0} là trạng thái kết thúc")
        @EnumSource(value = RepairStatus.class, names = {"DELIVERED", "CANCELLED"})
        void terminalStatesHaveNoExit(RepairStatus terminal) {
            assertThat(policy.isTerminal(terminal)).isTrue();
            for (RepairStatus to : RepairStatus.values()) {
                assertThat(policy.isEdgeAllowed(terminal, to)).isFalse();
            }
        }

        @Test
        void cannotSkipStraightToCompleted() {
            assertThatThrownBy(() -> policy.assertCanTransition(at(RECEIVED), COMPLETED, ADMIN, Channel.MANUAL, null))
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.INVALID_STATUS_TRANSITION);
        }
    }

    @Nested
    class Channels {

        @Test
        void quotationStatusesCannotBeSetManually() {
            assertThatThrownBy(() -> policy.assertCanTransition(at(INSPECTING), WAITING_CONFIRMATION, STAFF, Channel.MANUAL, null))
                    .hasMessageContaining("báo giá");
            assertThatThrownBy(() -> policy.assertCanTransition(at(WAITING_CONFIRMATION), APPROVED, ADMIN, Channel.MANUAL, null))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        void deliveredOnlyThroughDelivery() {
            assertThatThrownBy(() -> policy.assertCanTransition(at(COMPLETED), DELIVERED, STAFF, Channel.MANUAL, null))
                    .hasMessageContaining("bàn giao");
            assertThatCode(() -> policy.assertCanTransition(at(COMPLETED), DELIVERED, STAFF, Channel.DELIVERY, null))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    class Actors {

        @Test
        void onlyAssignedTechnicianOrAdminDoesTechnicalWork() {
            assertThatCode(() -> policy.assertCanTransition(at(RECEIVED), INSPECTING, TECH, Channel.MANUAL, null))
                    .doesNotThrowAnyException();
            assertThatCode(() -> policy.assertCanTransition(at(RECEIVED), INSPECTING, ADMIN, Channel.MANUAL, null))
                    .doesNotThrowAnyException();
            for (AuthenticatedUser notAllowed : new AuthenticatedUser[] {OTHER_TECH, STAFF, OWNER}) {
                assertThatThrownBy(() -> policy.assertCanTransition(at(RECEIVED), INSPECTING, notAllowed, Channel.MANUAL, null))
                        .extracting(e -> ((BusinessException) e).getErrorCode())
                        .isEqualTo(ErrorCode.ACCESS_DENIED);
            }
        }

        @Test
        void customerCanOnlyCancelOwnFreshOrder() {
            assertThatCode(() -> policy.assertCanTransition(at(RECEIVED), CANCELLED, OWNER, Channel.MANUAL, "Đổi ý"))
                    .doesNotThrowAnyException();
            assertThatThrownBy(() -> policy.assertCanTransition(at(RECEIVED), CANCELLED, OTHER_CUSTOMER, Channel.MANUAL, "x"))
                    .isInstanceOf(BusinessException.class);
            assertThatThrownBy(() -> policy.assertCanTransition(at(INSPECTING), CANCELLED, OWNER, Channel.MANUAL, "x"))
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.ACCESS_DENIED);
        }

        @Test
        void ownerOrStaffRespondsToQuotation() {
            assertThatCode(() -> policy.assertCanTransition(at(WAITING_CONFIRMATION), APPROVED, OWNER, Channel.QUOTATION, null))
                    .doesNotThrowAnyException();
            assertThatCode(() -> policy.assertCanTransition(at(WAITING_CONFIRMATION), REJECTED, STAFF, Channel.QUOTATION, null))
                    .doesNotThrowAnyException();
            assertThatThrownBy(() -> policy.assertCanTransition(at(WAITING_CONFIRMATION), APPROVED, TECH, Channel.QUOTATION, null))
                    .isInstanceOf(BusinessException.class);
        }
    }

    @Nested
    class Preconditions {

        @Test
        void inspectingRequiresAssignedTechnician() {
            order.setTechnician(null);
            assertThatThrownBy(() -> policy.assertCanTransition(at(RECEIVED), INSPECTING, ADMIN, Channel.MANUAL, null))
                    .hasMessageContaining("phân công");
        }

        @Test
        void completedRequiresSolution() {
            order.setSolution("  ");
            assertThatThrownBy(() -> policy.assertCanTransition(at(REPAIRING), COMPLETED, TECH, Channel.MANUAL, null))
                    .hasMessageContaining("phương án khắc phục");
        }

        @Test
        void cancelRequiresReason() {
            assertThatThrownBy(() -> policy.assertCanTransition(at(RECEIVED), CANCELLED, STAFF, Channel.MANUAL, " "))
                    .extracting(e -> ((BusinessException) e).getErrorCode())
                    .isEqualTo(ErrorCode.VALIDATION_FAILED);
        }
    }

    @Nested
    class AllowedTransitions {

        @Test
        void technicianSeesOnlyTechnicalActions() {
            Set<RepairStatus> forTech = policy.allowedManualTransitions(at(REPAIRING), TECH);
            assertThat(forTech).containsExactlyInAnyOrder(WAITING_FOR_PARTS, COMPLETED);
        }

        @Test
        void staffCanCancelButNotInspect() {
            assertThat(policy.allowedManualTransitions(at(RECEIVED), STAFF)).containsExactly(CANCELLED);
        }

        @Test
        void otherTechnicianSeesNothing() {
            assertThat(policy.allowedManualTransitions(at(RECEIVED), OTHER_TECH)).isEmpty();
        }

        @Test
        void neverExposesQuotationOrDeliveryTargets() {
            for (RepairStatus s : RepairStatus.values()) {
                assertThat(policy.allowedManualTransitions(at(s), ADMIN))
                        .doesNotContainAnyElementsOf(EnumSet.of(WAITING_CONFIRMATION, APPROVED, REJECTED, DELIVERED));
            }
        }
    }
}
