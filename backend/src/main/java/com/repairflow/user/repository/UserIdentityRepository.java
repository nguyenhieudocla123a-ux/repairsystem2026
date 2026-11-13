package com.repairflow.user.repository;

import com.repairflow.user.entity.SocialProvider;
import com.repairflow.user.entity.UserIdentity;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<UserIdentity> findByProviderAndProviderUserId(SocialProvider provider, String providerUserId);

    boolean existsByUserIdAndProvider(Long userId, SocialProvider provider);
}
