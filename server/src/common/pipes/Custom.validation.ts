import { BadRequestException, ValidationError } from '@nestjs/common';

export const CustomValidationMessages = (errors: ValidationError[]) => {
  const error = errors[0];

  const result = {
    property: error.property,
    message: error.constraints[Object.keys(error.constraints)[0]],
  };

  return new BadRequestException(result);
};
