export class ErrorCustom extends Error {
  public statusCode: number;
  public isOperationError: boolean;
  public errorType: string;
  public status: string;

  constructor(
    _message: string,
    _isOperationError: boolean,
    _statusCode?: number,
    _errorType?: string | null
  ) {
    super(_message);
    this.statusCode = _statusCode || 500;
    this.errorType = _errorType || null;
    this.status =
      this.statusCode >= 400 && this.statusCode < 500 ? 'Failed' : 'Error';
    this.isOperationError = _isOperationError;
  }
}
