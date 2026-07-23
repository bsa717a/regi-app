export type RegiChatRole = "user" | "assistant";

export type RegiChatMessageDto = {
  id: string;
  role: RegiChatRole;
  content: string;
  createdAt: string;
};

export type RegiChatResponse = {
  messages: RegiChatMessageDto[];
  quickActions: string[];
};

export type RegiGarageVehicleContext = {
  id: string;
  label: string;
  type: string;
  state: string;
  year: number | null;
  make: string | null;
  model: string | null;
  plate: string | null;
  status: string;
  daysUntilExpiration: number;
  expiresOn: string;
  documentCount: number;
};

export type RegiGarageContext = {
  userFirstName: string | null;
  vehicleCount: number;
  documentCount: number;
  soonestExpiration: RegiGarageVehicleContext | null;
  vehicles: RegiGarageVehicleContext[];
};
