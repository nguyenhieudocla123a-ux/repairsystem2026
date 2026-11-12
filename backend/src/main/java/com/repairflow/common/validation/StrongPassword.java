package com.repairflow.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Chính sách mật khẩu dùng chung (khớp với Zod schema ở Frontend): 8–72 ký tự, có chữ hoa, chữ thường, chữ số.
 * 72 là giới hạn của BCrypt (phần vượt quá bị bỏ qua khi băm).
 */
@NotBlank(message = "Vui lòng nhập mật khẩu")
@Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự")
@Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$", message = "Mật khẩu cần có chữ hoa, chữ thường và chữ số")
@Constraint(validatedBy = {})
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {

    String message() default "Mật khẩu không hợp lệ";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
