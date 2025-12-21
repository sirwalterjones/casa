import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

const ApiTest = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const testAPI = async () => {
            try {
                setLoading(true);
                // Use the apiClient instead of direct fetch
                const response = await apiClient.casaGet('cases');
                const data = response;
                
                if (data && data.success && data.data && data.data.cases) {
                    setCases(data.data.cases);
                } else {
                    setError('No cases found or API error');
                }
            } catch (error) {
                setError(error.message);
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