const BASE = "http://127.0.0.1:5000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getUser(): { id: number; full_name: string; email: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...options, headers });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Request failed");
  }
  return json.data as T;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: number; full_name: string; email: string; role: string } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) }
      ),
    signup: (full_name: string, email: string, password: string, role: string) =>
      request<{ message: string; user_id: number; email: string }>(
        "/auth/signup",
        { method: "POST", body: JSON.stringify({ full_name, email, password, role }) }
      ),
    verifyOtp: (email: string, otp: string) =>
      request<{ token: string; user: object }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      }),
    resendOtp: (email: string) =>
      request<{ message: string }>("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
  },

  // ── PROVIDERS ──────────────────────────────────────────────────────────────
  providers: {
    list: (
      weights?: {
        punctuality_weight?: number;
        quality_weight?: number;
        environment_weight?: number;
        parking_weight?: number;
        accessibility_weight?: number;
      },
      category?: string,
      payment_type?: string
    ) => {
      const params = new URLSearchParams();
      if (weights) {
        Object.entries(weights).forEach(([k, v]) => {
          if (v !== undefined) params.set(k, String(v));
        });
      }
      if (category && category !== "all") params.set("category", category);
      if (payment_type && payment_type !== "all") params.set("payment_type", payment_type);
      const qs = params.toString();
      return request<Provider[]>(`/providers${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => request<ProviderDetail>(`/providers/${id}`),
  },

  // ── PAYMENTS ───────────────────────────────────────────────────────────────
  payments: {
    createOrder: (slot_id: number) =>
      request<{ order_id: string; amount: number; key: string }>("/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ slot_id }),
      }),
  },

  // ── BOOKINGS ───────────────────────────────────────────────────────────────
  bookings: {
    mine: () => request<Booking[]>("/bookings/mine"),
    create: (
      slot_id: number,
      answers: { question_id: number; answer_text: string }[],
      paymentDetails?: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
    ) =>
      request<{ booking_id: number; status: string; message: string }>("/bookings", {
        method: "POST",
        body: JSON.stringify({ slot_id, answers, ...paymentDetails }),
      }),
    cancel: (id: number, reason?: string) =>
      request<{ message: string; refund_percentage: number }>(`/bookings/${id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
  },

  // ── SLOTS ──────────────────────────────────────────────────────────────────
  slots: {
    get: (id: number) => request<SlotDetail>(`/slots/${id}`),
  },

  // ── USER ───────────────────────────────────────────────────────────────────
  user: {
    me: () => request<UserProfile>("/users/me"),
    preferences: () => request<UserPreferences>("/users/me/preferences"),
    updatePreferences: (prefs: UserPreferences) =>
      request<{ message: string }>("/users/me/preferences", {
        method: "PUT",
        body: JSON.stringify(prefs),
      }),
    updateProfile: (full_name: string) =>
      request<{ message: string }>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ full_name }),
      }),
  },

  // ── ORGANISER ──────────────────────────────────────────────────────────────
  organiser: {
    stats: () => request<OrgStats>("/organiser/stats"),
    bookings: (status?: string) =>
      request<OrgBooking[]>(`/organiser/bookings${status ? `?status=${status}` : ""}`),
    services: () => request<Service[]>("/appointments"),
    confirmBooking: (id: number) =>
      request<{ message: string }>(`/bookings/${id}/confirm`, { method: "PATCH" }),
    updateProfile: (data: { bio: string; address: string; phone: string; has_parking: boolean; is_wheelchair_accessible: boolean; noise_level: string }) =>
      request<{ message: string }>("/organiser/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    createService: (data: any) =>
      request<Service>("/appointments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateService: (id: number, data: any) =>
      request<Service>(`/appointments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteService: (id: number) =>
      request<{ message: string }>(`/appointments/${id}`, { method: "DELETE" }),
    publishService: (id: number) =>
      request<{ message: string }>(`/appointments/${id}/publish`, { method: "PATCH" }),
    unpublishService: (id: number) =>
      request<{ message: string }>(`/appointments/${id}/unpublish`, { method: "PATCH" }),
    getWorkingHours: () => request<WorkingHour[]>("/organiser/working-hours"),
    setWorkingHour: (data: WorkingHour) =>
      request<WorkingHour>("/organiser/working-hours", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    generateSlots: (appointment_type_id: number, start_date: string, end_date: string) =>
      request<{ message: string; slots_created: number }>("/slots/generate", {
        method: "POST",
        body: JSON.stringify({ appointment_type_id, start_date, end_date }),
      }),
  },

  // ── SERVICES ───────────────────────────────────────────────────────────────
  services: {
    list: () => request<Service[]>("/services"),
  },

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  admin: {
    stats: () => request<AdminStats>("/admin/stats"),
    recentBookings: () => request<AdminRecentBooking[]>("/admin/recent-bookings"),
    users: () => request<AdminUser[]>("/admin/users"),
    toggleActive: (user_id: number) => request<{ message: string; is_active: boolean }>(`/admin/users/${user_id}/toggle-active`, { method: "PATCH" }),
    bookings: () => request<AdminBooking[]>("/admin/bookings"),
  },
};

// ── TYPES ─────────────────────────────────────────────────────────────────────
export interface Provider {
  id: number;
  full_name: string;
  bio: string | null;
  has_parking: boolean;
  is_wheelchair_accessible: boolean;
  noise_level: string;
  punctuality_score: number | null;
  quality_score: number | null;
  environment_score: number | null;
  total_reviews: number | null;
  match_percentage: number;
}

export interface ProviderDetail extends Provider {
  member_since: string;
  email: string;
  address: string | null;
  phone: string | null;
  noise_level: string;
  services: Service[];
}

export interface Service {
  id: number;
  title: string;
  description: string;
  duration_mins: number;
  max_capacity: number;
  payment_requirement: "none" | "mandatory_advance";
  payment_amount: number;
  organiser_name?: string;
}

export interface Booking {
  id: number;
  status: string;
  booked_at: string;
  cancelled_at: string | null;
  slot_start: string;
  slot_end: string;
  service_title: string;
  duration_mins: number;
  organiser_name: string;
  has_feedback: boolean;
}

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface UserPreferences {
  punctuality_weight: number;
  quality_weight: number;
  environment_weight: number;
  parking_weight: number;
  accessibility_weight: number;
}

export interface OrgStats {
  summary: {
    total_bookings: number;
    completed: number;
    cancelled: number;
    unique_customers: number;
    avg_punctuality: number;
    avg_quality: number;
    total_reviews: number;
  };
  peak_hours: { hour: number; booking_count: number }[];
}

export interface OrgBooking {
  id: number;
  status: string;
  booked_at: string;
  slot_start: string;
  slot_end: string;
  service_title: string;
  customer_name: string;
  customer_email: string;
}

export interface Question {
  id: number;
  question_text: string;
  is_required: boolean;
}

export interface SlotDetail {
  id: number;
  slot_start: string;
  slot_end: string;
  capacity: number;
  booked_count: number;
  status: string;
  service_id: number;
  service_title: string;
  duration_mins: number;
  payment_requirement: "none" | "mandatory_advance";
  payment_amount: number;
  organiser_name: string;
  questions: Question[];
}

export interface WorkingHour {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface AdminStats {
  summary: {
    total_customers: number;
    total_providers: number;
    total_users: number;
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    published_services: number;
    total_reviews: number;
    total_revenue: number;
  };
  daily_bookings: { day: string; bookings: number }[];
  top_providers: {
    id: number;
    full_name: string;
    total_reviews: number;
    punctuality_score: number;
    quality_score: number;
  }[];
}

export interface AdminRecentBooking {
  id: number;
  customer: string;
  service: string;
  provider: string;
  date: string;
  status: string;
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  role: "customer" | "organiser" | "admin";
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AdminBooking {
  id: number;
  customer_name: string;
  provider_name: string;
  service: string;
  slot_start: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  payment_status: "unpaid" | "paid";
}
