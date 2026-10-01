import { apiRequest } from './client';
import type {
  PythonRunRequest,
  PythonRunResponse,
  SqlRunRequest,
  SqlRunResponse,
} from '../types';

export async function runSql(data: SqlRunRequest): Promise<SqlRunResponse> {
  return apiRequest<SqlRunResponse>('/api/run/sql', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function runPython(data: PythonRunRequest): Promise<PythonRunResponse> {
  return apiRequest<PythonRunResponse>('/api/run/python', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
