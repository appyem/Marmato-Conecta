'use client';

import { useState } from 'react';
import { 
  Box, Button, TextField, FormControl, InputLabel, 
  Select, MenuItem, FormControlLabel, Checkbox, 
  IconButton, Typography, Card, CardContent 
} from '@mui/material';
import { Add, Delete, DragHandle } from '@mui/icons-material';
import { FormField, FieldType } from '@/types/campaign';

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'date', label: 'Fecha' },
  { value: 'image', label: 'Imagen' },
  { value: 'document', label: 'Documento' },
  { value: 'checkbox', label: 'Checkbox' },
];

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
    };
    onChange([...fields, newField]);
    setEditingField(newField);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
    if (editingField?.id === id) setEditingField(null);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Lista de campos */}
      <Card sx={{ flex: 1, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Campos del formulario</Typography>
          <Button startIcon={<Add />} onClick={addField} variant="contained" size="small">
            Agregar campo
          </Button>
        </Box>
        
        {fields.map((field) => (
          <Box 
            key={field.id} 
            sx={{ 
              p: 1.5, 
              mb: 1, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'grey.100' }
            }}
            onClick={() => setEditingField(field)}
          >
            <IconButton size="small" sx={{ cursor: 'move' }}>
              <DragHandle fontSize="small" />
            </IconButton>
            <Typography sx={{ flex: 1 }}>
              {field.label || 'Sin título'} 
              <Typography component="span" variant="caption" color="text.secondary">
                {' '}({field.type})
              </Typography>
              {field.required && <Typography component="span" color="error">*</Typography>}
            </Typography>
            <IconButton 
              size="small" 
              color="error"
              onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Card>

      {/* Editor de campo */}
      {editingField && (
        <Card sx={{ flex: 1, p: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Editar campo</Typography>
            
            <TextField
              fullWidth
              label="Etiqueta"
              value={editingField.label}
              onChange={(e) => updateField(editingField.id, { label: e.target.value })}
              margin="normal"
              size="small"
            />
            
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Tipo de campo</InputLabel>
              <Select
                value={editingField.type}
                label="Tipo de campo"
                onChange={(e) => updateField(editingField.id, { type: e.target.value as FieldType })}
              >
                {FIELD_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Texto de ayuda"
              value={editingField.helperText || ''}
              onChange={(e) => updateField(editingField.id, { helperText: e.target.value })}
              margin="normal"
              size="small"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={editingField.required}
                  onChange={(e) => updateField(editingField.id, { required: e.target.checked })}
                />
              }
              label="Campo obligatorio"
            />
            
            {/* Opciones para select - placeholder para implementación futura */}
            {editingField.type === 'select' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Opciones:</Typography>
                <Typography variant="caption" color="text.secondary">
                  Editor de opciones en desarrollo...
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}