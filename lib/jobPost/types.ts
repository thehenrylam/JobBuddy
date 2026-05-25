export interface JobPost {
  id: string;
  name: string;
  job_title: string;
  company: string;
  job_type: string;
  location: string;
  pay_range: [number | null, number | null];
  date: string;
  keywords: string[];
  post_data: string;
}
