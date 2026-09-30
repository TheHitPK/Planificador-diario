package com.planificacion.api.user;

import com.planificacion.api.common.error.InvalidCredentialsException;
import com.planificacion.api.common.error.NotFoundException;
import com.planificacion.api.common.web.CurrentUserId;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/me")
public class UserController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    public record UserResponse(UUID id, String email, String fullName, Role role, Instant createdAt) {
        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getCreatedAt());
        }
    }

    public record UpdateProfileRequest(@NotBlank @Size(max = 120) String fullName) {
    }

    public record ChangePasswordRequest(@NotBlank String currentPassword,
                                        @NotBlank @Size(min = 8, max = 72) String newPassword) {
    }

    @GetMapping
    @Transactional(readOnly = true)
    public UserResponse me(@CurrentUserId UUID userId) {
        return UserResponse.from(load(userId));
    }

    @PatchMapping
    @Transactional
    public UserResponse update(@CurrentUserId UUID userId, @Valid @RequestBody UpdateProfileRequest req) {
        User user = load(userId);
        user.setFullName(req.fullName().trim());
        return UserResponse.from(user);
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void changePassword(@CurrentUserId UUID userId, @Valid @RequestBody ChangePasswordRequest req) {
        User user = load(userId);
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("La contraseña actual no es correcta");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
    }

    private User load(UUID userId) {
        return users.findById(userId).orElseThrow(() -> new NotFoundException("Usuario"));
    }
}
