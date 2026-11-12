import { Form } from 'antd'
import type { ReactElement } from 'react'
import { Controller, type Control, type ControllerRenderProps, type FieldPath, type FieldValues } from 'react-hook-form'

export interface FormFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  required?: boolean
  extra?: string
  render: (field: ControllerRenderProps<T, FieldPath<T>> & { id: string; 'aria-invalid': boolean }) => ReactElement
}

/**
 * Cầu nối React Hook Form ↔ AntD Form.Item: hiển thị lỗi (từ Zod hoặc từ API) ngay dưới field.
 * Gắn id + htmlFor để click nhãn focus vào input, aria-invalid để trình đọc màn hình biết field lỗi.
 */
export function FormField<T extends FieldValues>({ control, name, label, required, extra, render }: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          htmlFor={name}
          required={required}
          extra={extra}
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message}
        >
          {render({ ...field, id: name, 'aria-invalid': Boolean(fieldState.error) })}
        </Form.Item>
      )}
    />
  )
}
