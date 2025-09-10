export function errorToObj(err) {
  if (err instanceof Error) {
    const data = (err as any).response?.data
    return {
      error: err.message,
      stack: err.stack,
      data,
    }
  }
  return {
    error: err,
  }
}

export function errorToString(err) {
  return JSON.stringify(errorToObj(err))
}

export function isErrorWithStatus(err: unknown): err is { status: number; message?: string } {
  return typeof err === 'object' && err !== null && 'status' in err && typeof (err as any).status === 'number'
}
