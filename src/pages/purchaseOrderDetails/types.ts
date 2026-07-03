export type DocsRow = {
  id: string;
  line_item_id?: string;
  file_name?: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  status?: string;
  document_tag_to?: string;
  version?: number;
  ps_comments?: string;
  updated_at?: string;
  uploaded_at?: string;
};

export type HistoryRow = {
  id?: number | string;
  action?: string;
  actor_id?: string;
  actor_role?: string;
  previous_status?: string;
  new_status?: string;
  notes?: string;
  created_at?: string;
  timestamp?: string;
  line_item_id?: string;
};

export type DialogType =
  | 'NONE'
  | 'MOVE_IN'
  | 'MOVE_OUT'
  | 'SPLIT'
  | 'REJECT'
  | 'HOLD'
  | 'UNHOLD'
  | 'ACCEPT'
  | 'ACKNOWLEDGE'
  | 'NEED_MORE_INFORMATION'
  | 'PROPOSE_CHANGE'
  | 'RAISE_CONCESSION'
  | 'UPLOAD_DOCUMENT';
