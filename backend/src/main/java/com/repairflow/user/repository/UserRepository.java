package com.repairflow.user.repository;

import com.repairflow.repair.entity.RepairStatus;
import com.repairflow.user.dto.TechnicianOption;
import com.repairflow.user.entity.Role;
import com.repairflow.user.entity.User;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

    /** Id người dùng đang hoạt động theo vai trò – người nhận thông báo nhóm (VD mọi STAFF). */
    @Query("SELECT u.id FROM User u WHERE u.role IN :roles AND u.status = com.repairflow.user.entity.UserStatus.ACTIVE")
    List<Long> findActiveIdsByRoles(@Param("roles") Collection<Role> roles);

    /** KTV đang hoạt động + số phiếu đang xử lý → giúp STAFF phân công đều việc. */
    @Query("""
            SELECT new com.repairflow.user.dto.TechnicianOption(u.id, u.fullName, COUNT(r.id))
            FROM User u
            LEFT JOIN RepairOrder r ON r.technician = u AND r.status IN :activeStatuses
            WHERE u.role = com.repairflow.user.entity.Role.TECHNICIAN
              AND u.status = com.repairflow.user.entity.UserStatus.ACTIVE
            GROUP BY u.id, u.fullName
            ORDER BY u.fullName
            """)
    List<TechnicianOption> findActiveTechnicians(@Param("activeStatuses") Collection<RepairStatus> activeStatuses);
}
