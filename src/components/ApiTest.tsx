import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

interface CaseItem {
    id: string;
    case_number: string;
    child_first_name: string;
    child_last_name: string;
}

interface CasesApiResponse {
    success?: boolean;
    data?: {
        cases?: CaseItem[];
    };
    cases?: CaseItem[];
}

const ApiTest = () => {
    const [cases, setCases] = useState<CaseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const testAPI = async () => {
            try {
                setLoading(true);
                // Use the apiClient instead of direct fetch
                const response = await apiClient.casaGet<CasesApiResponse>('cases');
                const data = response.data as CasesApiResponse | undefined;

                if (data && data.data && data.data.cases) {
                    setCases(data.data.cases);
                } else if (data && data.cases) {
                    setCases(data.cases);
                } else {
                    setError('No cases found or API error');
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        testAPI();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h1>Cases from API</h1>
            <p>Found {cases.length} cases</p>
            <ul>
                {cases.map(caseItem => (
                    <li key={caseItem.id}>
                        {caseItem.case_number} - {caseItem.child_first_name} {caseItem.child_last_name}
                    </li>
                ))}
            </ul>
            <pre>{JSON.stringify(cases, null, 2)}</pre>
        </div>
    );
};

export default ApiTest;
