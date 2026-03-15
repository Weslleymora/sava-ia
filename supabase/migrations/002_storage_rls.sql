-- Políticas de Storage para o bucket "documents"
-- Execute no Supabase SQL Editor após criar o bucket manualmente

-- Permite que usuários autenticados façam upload na própria pasta (userId/...)
CREATE POLICY "storage_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Permite que usuários leiam arquivos da própria pasta
CREATE POLICY "storage_documents_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Permite que usuários deletem arquivos da própria pasta
CREATE POLICY "storage_documents_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
