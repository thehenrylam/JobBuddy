export type FieldType =
  | 'text' | 'email' | 'tel' | 'number' | 'url' | 'date'
  | 'textarea' | 'select' | 'multiselect'
  | 'radio' | 'checkbox' | 'file';

export interface FormField {
  id: string;
  prompt: string;
  type: FieldType;
  options?: string[];
  required: boolean;
  response: string | string[] | boolean | null;
  fields?: FormField[];
}

export interface FormSchema {
  fields: FormField[];
}
