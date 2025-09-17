'use client';

type InputType = {
  id?: string;
  name?: string;
  rootClass?: string;
  label?: string;
  type?: string;
  placeholder?: string;
  value: string;
  className?: string;
  required?: boolean;
  setValue?: (v: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (e: any) => void;
};

export const Input = ({
  id,
  name,
  label,
  type,
  placeholder,
  value,
  setValue,
  required,
  className,
  rootClass,
}: InputType) => {
  return (
    <div className={rootClass}>
      {label && (
        <label>
          {required && <span style={{ color: '#7ff' }}>* </span>}
          {label}
        </label>
      )}
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          if (setValue) setValue(e.target.value);
        }}
        required={required}
        className={className}
      />
    </div>
  );
};
