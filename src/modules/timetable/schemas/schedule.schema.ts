import { z } from "zod";

export const DayOfWeekEnum = z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
]);

export const ClassTypeEnum = z.enum(["LECTURE", "LAB", "TUTORIAL", "SEMINAR"]);

const CreateScheduleBaseSchema = z.object({
    offeringId: z.number().int().positive(),
    tutorId: z.number().int().positive(),
    dayOfWeek: DayOfWeekEnum,
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
    venue: z.string().min(1, "Venue is required").max(100),
    classType: ClassTypeEnum,
});

export const CreateScheduleSchema = CreateScheduleBaseSchema.refine(
    (d) => d.endTime > d.startTime,
    { message: "End time must be after start time", path: ["endTime"] }
);

export const UpdateScheduleSchema = CreateScheduleBaseSchema.partial();

export const ScheduleFilterSchema = z.object({
    semesterId: z.number().int().optional(),
    offeringId: z.number().int().optional(),
    tutorId: z.number().int().optional(),
    dayOfWeek: DayOfWeekEnum.optional(),
    venue: z.string().optional(),
    classType: ClassTypeEnum.optional(),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
});
