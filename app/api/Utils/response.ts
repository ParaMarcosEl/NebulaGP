import { NextResponse } from 'next/server';

export type ApiSuccess<T> = {
  success: true;
  data: T;
  error: null;
};

export type ApiFailure = {
  success: false;
  data: null;
  error: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      error: null,
    },
    { status },
  );
}

export function fail(error: string, status = 400) {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      data: null,
      error,
    },
    { status },
  );
}
