import { createCrudService } from './crudServiceSqlite';

export const HolidayPublicService = createCrudService('/holidayPublic');
export const HolidaysPublicService = HolidayPublicService;