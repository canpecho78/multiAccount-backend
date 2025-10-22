import mongoose, { Schema } from "mongoose";

// Lista completa de permisos del sistema
export const PERMISSIONS = [
  // User Management
  'users.view',
  'users.create',
  'users.edit',
  'users.delete',
  'users.manage_roles',
  
  // Contact Management
  'contacts.view',
  'contacts.sync',
  'contacts.export',
  
  // Chat Management
  'chats.view',
  'chats.send',
  'chats.assign',
  'chats.view_all',
  
  // Session Management
  'sessions.view',
  'sessions.create',
  'sessions.delete',
  'sessions.manage',
  
  // Analytics
  'analytics.view',
  'analytics.export',
  
  // Settings
  'settings.view',
  'settings.edit',
] as const;

export type Permission = typeof PERMISSIONS[number];

const RoleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  permissions: [{
    type: String,
    enum: PERMISSIONS
  }],
  isSystem: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices
RoleSchema.index({ name: 1 });
RoleSchema.index({ isSystem: 1, active: 1 });

export type RoleDoc = mongoose.Document & {
  name: string;
  displayName: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const Role = mongoose.model<RoleDoc>("Role", RoleSchema);
