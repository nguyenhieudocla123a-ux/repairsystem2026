package com.repairflow.dashboard.controller;

import com.repairflow.dashboard.dto.DashboardDtos.AdminDashboardResponse;
import com.repairflow.dashboard.dto.DashboardDtos.AmountPoint;
import com.repairflow.dashboard.dto.DashboardDtos.CustomerDashboardResponse;
import com.repairflow.dashboard.dto.DashboardDtos.PartUsageStat;
import com.repairflow.dashboard.dto.DashboardDtos.StaffDashboardResponse;
import com.repairflow.dashboard.dto.DashboardDtos.TechnicianDashboardResponse;
import com.repairflow.dashboard.dto.DashboardDtos.TechnicianStat;
import com.repairflow.dashboard.service.DashboardService;
import com.repairflow.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Dashboard & Reports", description = "Số liệu tổng quan theo vai trò, báo cáo ADMIN")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService service;

    @Operation(summary = "Dashboard ADMIN (mặc định 30 ngày gần nhất, cache Redis 60s)")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/dashboard/admin")
    public AdminDashboardResponse admin(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.admin(from == null ? service.defaultFrom() : from, to == null ? service.today() : to);
    }

    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @GetMapping("/dashboard/staff")
    public StaffDashboardResponse staff(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.staff(user);
    }

    @PreAuthorize("hasRole('TECHNICIAN')")
    @GetMapping("/dashboard/technician")
    public TechnicianDashboardResponse technician(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.technician(user);
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/dashboard/customer")
    public CustomerDashboardResponse customer(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.customer(user);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/reports/revenue")
    public List<AmountPoint> revenue(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                     @RequestParam(defaultValue = "DAY") String groupBy) {
        return service.revenueReport(from, to, "MONTH".equalsIgnoreCase(groupBy));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/reports/parts-usage")
    public List<PartUsageStat> partsUsage(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                          @RequestParam(defaultValue = "10") int limit) {
        return service.partsUsageReport(from, to, limit);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/reports/technician-performance")
    public List<TechnicianStat> technicians(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.technicianReport(from, to);
    }
}
