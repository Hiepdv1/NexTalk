import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidSDPConstraint implements ValidatorConstraintInterface {
  validate(
    value: RTCSessionDescriptionInit,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    args: ValidationArguments
  ): boolean {
    if (!value || typeof value !== 'object') return false;

    const validTypes = ['offer', 'answer', 'pranswer', 'rollback'];
    return (
      'type' in value &&
      validTypes.includes(value.type) &&
      'sdp' in value &&
      typeof value.sdp === 'string' &&
      value.sdp.trim().length > 0
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments): string {
    return 'sdp must be a valid RTCSessionDescriptionInit object with a valid type and sdp string.';
  }
}

export function IsValidSDP(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidSDPConstraint,
    });
  };
}
