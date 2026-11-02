import { boolean, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // User ID / username
  email: text('email'),
  displayName: text('display_name'),
  role: text('role').notNull().default('full'), // 'admin' | 'full' | 'limited'
  salt: text('salt'),
  passwordHash: text('password_hash'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// CCTV Requests table storing all tracker requests
export const cctvRequests = pgTable('cctv_requests', {
  id: text('id').primaryKey(),
  no: text('no').notNull().unique(),
  status: text('status').notNull().default('Submitted'),
  reqDate: text('req_date').notNull(),
  reqTime: text('req_time').notNull(),
  name: text('name').notNull(),
  empId: text('emp_id').notNull(),
  dept: text('dept').notNull(),
  pos: text('pos').notNull(),
  contact: text('contact').notNull(),
  email: text('email').notNull(),
  purposes: jsonb('purposes').$type<string[]>().notNull(),
  purposeOther: text('purpose_other'),
  area: text('area').notNull(),
  recDate: text('rec_date').notNull(),
  recFrom: text('rec_from'),
  recTo: text('rec_to'),
  footage: jsonb('footage').$type<string[]>().notNull(),
  footageOther: text('footage_other'),
  media: jsonb('media').$type<string[]>().notNull(),
  mediaOther: text('media_other'),
  ack: boolean('ack').notNull().default(false),
  sigName: text('sig_name'),
  sigDate: text('sig_date'),
  recvBy: text('recv_by'),
  recvDate: text('recv_date'),
  revBy: text('rev_by'),
  avail: text('avail'),
  quality: text('quality'),
  apprName: text('appr_name'),
  apprDate: text('appr_date'),
  remarks: text('remarks'),
  by: text('by'),
  created: text('created').notNull(),
  updated: text('updated').notNull(),
});

// App settings table for persistent settings
export const appSettings = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});
