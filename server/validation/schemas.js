const { z } = require('zod');

// --- Auth ---
const loginSchema = z
    .object({
        user: z.string().min(1, 'Benutzername ist erforderlich'),
        pass: z.string().min(1, 'Passwort ist erforderlich'),
    })
    .passthrough();

const forgotPasswordSchema = z
    .object({
        user: z.string().min(1, 'Benutzername ist erforderlich'),
    })
    .passthrough();

const changePasswordSchema = z
    .object({
        newPassword: z.string().min(12, 'Passwort zu kurz (min. 12 Zeichen)'),
    })
    .passthrough();

// --- Menu ---
const menuItemSchema = z
    .object({
        name: z.string().min(1, 'Name ist erforderlich'),
    })
    .passthrough();

const menuReorderSchema = z
    .object({
        ids: z.array(z.string()),
    })
    .passthrough();

const menuBulkSchema = z
    .object({
        ids: z.array(z.string()).min(1, 'Mindestens eine ID erforderlich'),
        action: z.enum(['enable', 'disable', 'delete', 'set_category']),
        cat: z.string().optional(),
    })
    .passthrough();

const categorySchema = z
    .object({
        label: z.string().min(1, 'Label ist erforderlich'),
    })
    .passthrough();

const feedbackSchema = z
    .object({
        rating: z.union([z.string(), z.number()]),
        guest_name: z.string().max(255).optional(),
        comment: z.string().max(2000).optional(),
    })
    .passthrough();

// --- Reservations ---
const reservationCheckSchema = z
    .object({
        date: z.string(),
        time: z.string(),
        guests: z.union([z.string(), z.number()]),
    })
    .passthrough();

const reservationGridSchema = z
    .object({
        date: z.string(),
        guests: z.union([z.string(), z.number()]),
        times: z.array(z.string()).max(96),
    })
    .passthrough();

const reservationSubmitSchema = z
    .object({
        name: z.string().min(1, 'Name ist erforderlich'),
        date: z.string(),
        time: z.string(),
        guests: z.union([z.string(), z.number()]),
    })
    .passthrough();

// --- Cart & Orders ---
const cartOrderSchema = z
    .object({
        type: z.enum(['dine_in', 'pickup', 'delivery']),
        items: z.array(z.any()).min(1, 'Warenkorb ist leer'),
    })
    .passthrough();

const orderStatusUpdateSchema = z
    .object({
        status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
    })
    .passthrough();

// --- Users ---
const userSchema = z
    .object({
        user: z.string().min(1, 'Benutzername ist erforderlich'),
        role: z.enum(['admin', 'waiter', 'kitchen'], {
            errorMap: () => ({ message: 'Rolle muss admin, waiter oder kitchen sein' }),
        }),
    })
    .passthrough();

// --- Fallbacks / Generic ---
const anyObjectSchema = z.object({}).passthrough();
const anyArraySchema = z.array(z.any());

module.exports = {
    loginSchema,
    forgotPasswordSchema,
    changePasswordSchema,
    menuItemSchema,
    menuReorderSchema,
    menuBulkSchema,
    categorySchema,
    feedbackSchema,
    reservationCheckSchema,
    reservationGridSchema,
    reservationSubmitSchema,
    cartOrderSchema,
    orderStatusUpdateSchema,
    userSchema,
    anyObjectSchema,
    anyArraySchema,
};
