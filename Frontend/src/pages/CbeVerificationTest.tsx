import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Upload, Shield, CheckCircle, XCircle, RotateCcw, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import { toast } from 'react-hot-toast';

const CbeVerificationTest = () => {
  useTranslation();
  // States for transaction verification
  const [transactionId, setTransactionId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('https://example-cbe-api.com/verify');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // States for transaction ID detection
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle transaction verification
  const handleVerifyTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !accountNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Dynamically import the cbe-verifier package to handle the Node.js globals issue
      const { verify } = await import('@jvhaile/cbe-verifier');
      
      const result = await verify({
        transactionId,
        accountNumberOfSenderOrReceiver: accountNumber,
        cbeVerificationUrl: verificationUrl,
      });

      if (result.isRight()) {
        setVerificationResult(result.extract());
        toast.success('Transaction verified successfully!');
      } else {
        setVerificationResult({ error: result.extract(), isError: true });
        toast.error(`Verification failed: ${(result.extract() as any).type || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationResult({ error: error.message, isError: true });
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle transaction ID detection
  const handleDetectTransactionId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    setIsDetecting(true);
    setDetectionResult(null);

    try {
      // Dynamically import the cbe-verifier package to handle the Node.js globals issue
      const { detectTransactionId } = await import('@jvhaile/cbe-verifier');
      
      const buffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const result = await detectTransactionId(uint8Array as any, {
        googleVisionAPIKey: googleApiKey,
      });

      if (result) {
        setDetectionResult(result);
        toast.success('Transaction ID detected successfully!');
      } else {
        setDetectionResult({ error: 'No transaction ID found in image', isError: true });
        toast.error('No transaction ID detected');
      }
    } catch (error: any) {
      console.error('Detection error:', error);
      setDetectionResult({ error: error.message, isError: true });
      toast.error(`Detection failed: ${error.message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  // Reset verification form
  const resetVerificationForm = () => {
    setTransactionId('');
    setAccountNumber('');
    setVerificationResult(null);
    toast.success('Form reset');
  };

  // Reset detection form
  const resetDetectionForm = () => {
    setSelectedFile(null);
    setDetectionResult(null);
    document.getElementById('file-upload')?.setAttribute('value', '');
    toast.success('Form reset');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CBE Transaction Verification</h1>
          <p className="text-gray-600">
            Test the Commercial Bank of Ethiopia transaction verification functionality
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transaction Verification Section */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Transaction Verification
            </h2>
            <form onSubmit={handleVerifyTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction ID *
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="input w-full"
                  placeholder="Enter transaction ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="input w-full"
                  placeholder="Enter account number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification URL
                </label>
                <input
                  type="url"
                  value={verificationUrl}
                  onChange={(e) => setVerificationUrl(e.target.value)}
                  className="input w-full"
                  placeholder="https://cbe-verification-api.com/verify"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="btn btn-primary flex-1"
                >
                  {isVerifying ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Verify Transaction
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetVerificationForm}
                  className="btn btn-outline"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Verification Result */}
            {verificationResult && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Verification Result</h3>
                <div className={`p-4 rounded-lg ${verificationResult.isError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  {verificationResult.isError ? (
                    <div className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-800">Verification Failed</p>
                        <p className="text-red-700 mt-1">{verificationResult.error?.message || verificationResult.error?.type || JSON.stringify(verificationResult.error)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800">Verification Successful</p>
                        <div className="mt-2 text-sm text-green-700">
                          <pre className="whitespace-pre-wrap break-words text-xs bg-green-100 p-2 rounded mt-2 max-h-60 overflow-y-auto">
                            {JSON.stringify(verificationResult, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transaction ID Detection Section */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Transaction ID Detection
            </h2>
            <form onSubmit={handleDetectTransactionId} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screenshot Image *
                </label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-gray-300 bg-gray-50 hover:bg-gray-100">
                    {selectedFile ? (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="text-sm text-gray-600 truncate max-w-full">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-600">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG (MAX. 5MB)</p>
                      </div>
                    )}
                    <input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      accept=".png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Vision API Key (Optional)
                </label>
                <input
                  type="password"
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  className="input w-full"
                  placeholder="Enter Google Vision API key for text recognition"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isDetecting || !selectedFile}
                  className={`btn flex-1 ${!selectedFile ? 'btn-disabled' : 'btn-primary'}`}
                >
                  {isDetecting ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Detect Transaction ID
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetDetectionForm}
                  className="btn btn-outline"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Detection Result */}
            {detectionResult && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Detection Result</h3>
                <div className={`p-4 rounded-lg ${detectionResult.isError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  {detectionResult.isError ? (
                    <div className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-800">Detection Failed</p>
                        <p className="text-red-700 mt-1">{detectionResult.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800">Detection Successful</p>
                        <div className="mt-2 text-sm text-green-700">
                          <p><strong>Detected ID:</strong> {detectionResult.value}</p>
                          <p><strong>Method:</strong> {detectionResult.detectedFrom}</p>
                          <p><strong>Time Taken:</strong> {detectionResult.timeTaken}ms</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">About CBE Verification</h2>
          <div className="prose max-w-none text-gray-600">
            <p>
              This page allows you to test the Commercial Bank of Ethiopia (CBE) transaction verification functionality.
              The library can verify transactions by ID and account number, and also detect transaction IDs from screenshots
              using QR codes or text recognition.
            </p>
            <p className="mt-2">
              Note: The verification URL should point to the actual CBE verification API endpoint. 
              Since these APIs may only be accessible from within Ethiopia, you might need to set up a proxy server if you're accessing from outside Ethiopia.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CbeVerificationTest;