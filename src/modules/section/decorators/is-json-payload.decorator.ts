import { registerDecorator, ValidationOptions, ValidationArguments } from "class-validator";
import { SectionDataPayload } from "@/modules/section/types/section-response-interface";

const isPayload = (value: unknown): value is SectionDataPayload =>
    value !== null && typeof value === "object";

export function IsJsonPayload(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "isJsonPayload",
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
        validator: {
            validate(value: unknown) {
                return isPayload(value);
            },
            defaultMessage(args: ValidationArguments) {
                return `${args.property} must be an object or array`;
            },
        },
        });
    };
}
