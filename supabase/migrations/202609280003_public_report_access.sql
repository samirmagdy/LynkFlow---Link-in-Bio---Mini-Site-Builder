-- Public visitors may submit abuse reports without gaining read access.
create policy "anyone can submit an abuse report"
  on public.abuse_reports for insert
  to anon, authenticated
  with check (workspace_id is null);
