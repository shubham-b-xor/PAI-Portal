import React, { useState } from 'react';
import { Close, Delete, Download, OpenInFull, Upload } from '@mui/icons-material';
import { Box, Button, Dialog, DialogActions, DialogContent, Divider, IconButton, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';

import { poDetailsColors } from './constants';
import { DocsRow } from '@/pages/purchaseOrderDetails/types';

type UploadDocumentDialogProps = {
  open: boolean;
  mode: 'UPLOAD' | 'REPLACE';
  poNumber?: string;
  lineId: string;
  uploadFile: File | null;
  uploadComments: string;
  documentTags: string[];
  selectedDocumentTag: string;
  selectedDocumentName?: string;
  documentsRows: DocsRow[];
  onUploadFileChange: (file: File | null) => void;
  onSelectedDocumentTagChange: (value: string) => void;
  onUploadCommentsChange: (value: string) => void;
  onDownloadDocument: (document: DocsRow) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const UploadDocumentDialog: React.FC<UploadDocumentDialogProps> = ({
  open,
  mode,
  poNumber,
  lineId,
  uploadFile,
  uploadComments,
  documentTags,
  selectedDocumentTag,
  selectedDocumentName,
  documentsRows,
  onUploadFileChange,
  onSelectedDocumentTagChange,
  onUploadCommentsChange,
  onDownloadDocument,
  onClose,
  onSubmit,
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const title = mode === 'REPLACE' ? 'Replace Document' : 'Upload Document';
  const submitLabel = mode === 'REPLACE' ? 'Replace Document' : 'Upload Document';
  const availableTags = documentTags.length > 0 ? documentTags : ['LINE_ITEM'];
  const poSuffix = poNumber ? ` - PO ${poNumber}` : '';
  const headerSuffix = lineId ? ` - PO Line ${lineId}` : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullscreen} PaperProps={{ sx: { borderRadius: fullscreen ? 0 : 1.5 } }}>
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ px: 2, py: 1, backgroundColor: poDetailsColors.darkBlue, color: '#fff' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            {`${title}${poSuffix}${headerSuffix}`}
            {mode === 'REPLACE' && selectedDocumentName ? ` (${selectedDocumentName})` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', right: 8, top: 8 }} alignItems="center">
          <IconButton size="small" onClick={() => setFullscreen((value) => !value)} sx={{ color: 'common.white' }}>
            <OpenInFull fontSize="small" />
          </IconButton>
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.45)' }} />
          <IconButton size="small" onClick={onClose} sx={{ color: 'common.white' }}>
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 3, borderLeft: 0, borderRight: 0, borderRadius: 0 }}>
            <Stack spacing={1.5} alignItems="center" sx={{ py: 1 }}>
              <Upload color="action" />
              <Typography variant="body2"><Typography component="span" color="primary">Link</Typography> or drag and drop</Typography>
              <Typography variant="caption" color="text.secondary">PDF, DOC, Excel, PNG, JPG or Zip (max. 3MB)</Typography>
              <Button component="label" variant="outlined" size="small">
                Choose File
                <input hidden type="file" onChange={(e) => onUploadFileChange(e.target.files?.[0] || null)} />
              </Button>
              {uploadFile ? <Typography variant="caption">Selected: {uploadFile.name}</Typography> : null}
            </Stack>
          </Paper>

          <Box sx={{ px: 2 }}>
            <TextField
              label="Document Tag"
              select
              fullWidth
              size="small"
              value={selectedDocumentTag}
              onChange={(e) => onSelectedDocumentTagChange(e.target.value)}
              sx={{ mb: 2 }}
            >
              {availableTags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Comments" fullWidth size="small" multiline rows={3} value={uploadComments} onChange={(e) => onUploadCommentsChange(e.target.value)} />
          </Box>

          {documentsRows.length ? (
            <Stack spacing={1} sx={{ px: 2, pb: 1 }}>
              {documentsRows.map((document) => (
                <Stack key={document.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ borderRadius: 1, p: 1 }}>
                  <Box>
                    <Typography variant="body2" color="primary.main" sx={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onDownloadDocument(document)}>
                      {document.file_name || document.file_path}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{document.file_size || 0}b • {document.status || 'PENDING'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => onDownloadDocument(document)}><Download fontSize="small" /></IconButton>
                    <IconButton size="small"><Delete fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit}>{submitLabel}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadDocumentDialog;