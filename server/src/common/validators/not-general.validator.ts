import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsNotGeneral(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotGeneral',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && value.toLowerCase() !== 'general';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} should not be 'General' or 'general'`;
        },
      },
    });
  };
}
