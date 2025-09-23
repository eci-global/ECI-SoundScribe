-- Create storage bucket for training data uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('training-data', 'training-data', false);

-- Create storage policies for training data uploads
CREATE POLICY "Users can upload their own training data" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'training-data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own training data" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'training-data' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own training data" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'training-data' AND auth.uid() IS NOT NULL);