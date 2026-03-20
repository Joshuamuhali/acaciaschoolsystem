import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  const user = getCurrentUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-lg font-medium text-gray-900">
              You don't have permission to access this page.
            </div>
            
            {user && (
              <div className="text-sm text-gray-600">
                <p>Logged in as: <strong>{user.fullName}</strong></p>
                <p>Role: <strong>{user.role}</strong></p>
              </div>
            )}

            <div className="pt-4">
              <Button onClick={handleGoBack} variant="outline">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
