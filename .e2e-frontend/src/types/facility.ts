export interface Facility {
  _id: string;
  ownerId?: string;
  name: string;
  category: string;
  image: string | string[];
  location: string;
  pricePerHour: number;
  capacity: number;
  securityDeposit: number;
  description: string;
}
