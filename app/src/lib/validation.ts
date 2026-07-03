import { z } from 'zod';

// ================== 认证相关 ==================

export const loginSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码').min(6, '密码至少6位'),
});

export const registerSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码').min(6, '密码至少6位'),
  displayName: z.string().min(1, '请输入显示昵称').max(30, '昵称不超过30字'),
  username: z.string().max(30, '用户名不超过30字').optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ================== 社区帖子 ==================

export const postSchema = z.object({
  title: z.string().min(1, '请输入标题').max(100, '标题不超过100字'),
  content: z.string().min(1, '请输入内容').max(10000, '内容不超过10000字'),
  type: z.enum(['record', 'post', 'qa', 'experience']),
  tags: z.array(z.string().max(20)).max(10, '最多10个标签'),
  author: z.string().min(1, '请输入作者'),
});

export const commentSchema = z.object({
  content: z.string().min(1, '请输入评论内容').max(2000, '评论不超过2000字'),
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().optional(),
});

export type PostInput = z.infer<typeof postSchema>;
export type CommentInput = z.infer<typeof commentSchema>;

// ================== 医案 ==================

export const medicalRecordSchema = z.object({
  title: z.string().min(1, '请输入标题').max(200, '标题不超过200字'),
  doctor: z.string().max(50).optional(),
  patient: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
  era: z.string().max(50).optional(),
  metadata: z.object({
    cause: z.string().max(500).optional(),
    locationOfDisease: z.string().max(200).optional(),
    mechanism: z.string().max(500).optional(),
    symptoms: z.array(z.string().max(50)).max(50),
    tcmDiagnosis: z.array(z.string().max(50)).max(50),
    wmDiagnosis: z.array(z.string().max(50)).max(50),
    source: z.string().max(500).optional(),
  }),
  content: z.string().max(50000),
  tags: z.array(z.string().max(20)).max(20),
});

export type MedicalRecordInput = z.infer<typeof medicalRecordSchema>;
