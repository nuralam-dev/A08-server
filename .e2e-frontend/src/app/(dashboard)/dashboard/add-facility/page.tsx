import { Suspense } from 'react';
import AddFacilityForm from '../_components/AddFacilityForm';
import { requireSession } from '@/lib/require-session';

async function ProtectedAddFacility() {
    await requireSession('/dashboard/add-facility');
    return <AddFacilityForm />;
}

const AddFacilityPage = () => {
    return (
        <div>
            <Suspense fallback={<p role="status" className="p-6">Loading...</p>}>
                <ProtectedAddFacility />
            </Suspense>
        </div>
    );
};

export default AddFacilityPage;
