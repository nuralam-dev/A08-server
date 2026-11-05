import { Suspense } from 'react';
import MyBookings from '../_components/MyBookings';
import { requireSession } from '@/lib/require-session';

async function ProtectedBookings() {
    await requireSession('/dashboard/my-booking');
    return <MyBookings />;
}

const MyBookingPage = () => {
    return (
        <div>
            <Suspense fallback={<p role="status" className="p-6">Loading...</p>}>
                <ProtectedBookings />
            </Suspense>
        </div>
    );
};

export default MyBookingPage;
