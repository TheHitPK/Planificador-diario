package com.planificacion.api.user;

import com.planificacion.api.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    /** Siempre en minúsculas (lo garantiza la BD con un CHECK). */
    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false)
    private AccountType accountType = AccountType.PERSONAL;

    @Column(nullable = false)
    private boolean enabled = true;

    public User(String email, String passwordHash, String fullName) {
        this(email, passwordHash, fullName, AccountType.PERSONAL);
    }

    public User(String email, String passwordHash, String fullName, AccountType accountType) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.accountType = accountType;
    }
}
