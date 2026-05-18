-- Storage bucket for message attachments and voice notes

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY message_attachments_select ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

CREATE POLICY message_attachments_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY message_attachments_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
