export interface Booking {
  _id: string;
  facilityId: string;
  name: string;
  email: string;
  userId?: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
}
