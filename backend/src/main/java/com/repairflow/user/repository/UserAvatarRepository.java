package com.repairflow.user.repository;

import com.repairflow.user.entity.UserAvatar;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAvatarRepository extends JpaRepository<UserAvatar, Long> {
}
