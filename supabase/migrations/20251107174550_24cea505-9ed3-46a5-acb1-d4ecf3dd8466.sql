-- Add DELETE policy for tickets table to allow users to delete their own tickets
CREATE POLICY "Users can delete their own tickets"
ON public.tickets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);