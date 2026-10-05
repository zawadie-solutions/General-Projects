import { logger } from "../logger";

export class AsanaError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  html_notes?: string;
  completed?: boolean;
  permalink_url?: string;
  num_subtasks?: number;
}

export interface AsanaSection {
  gid: string;
  name: string;
}

const BASE = "https://app.asana.com/api/1.0";
const TASK_FIELDS = "name,notes,html_notes,completed,permalink_url,num_subtasks";

export class AsanaClient {
  constructor(
    private token: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<{ data: T; next?: string }> {
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.fetchImpl(url, { headers: { Authorization: `Bearer ${this.token}` } });
      } catch (e) {
        if (attempt < 2) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw new AsanaError(`Asana network error: ${(e as Error).message}`);
      }
      if (res.status === 429 && attempt < 4) {
        const wait = Number(res.headers.get("retry-after") ?? "5") * 1000;
        logger.warn({ path, wait }, "asana rate limited");
        await sleep(wait);
        continue;
      }
      if (res.status >= 500 && attempt < 2) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new AsanaError(`Asana ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`, res.status);
      const body = (await res.json()) as { data: T; next_page?: { offset?: string } | null };
      return { data: body.data, next: body.next_page?.offset };
    }
  }

  private async getAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const out: T[] = [];
    let offset: string | undefined;
    do {
      const r = await this.get<T[]>(path, { limit: "100", ...params, ...(offset ? { offset } : {}) });
      out.push(...r.data);
      offset = r.next;
    } while (offset);
    return out;
  }

  sections(projectGid: string): Promise<AsanaSection[]> {
    return this.getAll(`/projects/${projectGid}/sections`, { opt_fields: "name" });
  }

  sectionTasks(sectionGid: string): Promise<AsanaTask[]> {
    return this.getAll(`/sections/${sectionGid}/tasks`, { opt_fields: TASK_FIELDS });
  }

  subtasks(taskGid: string): Promise<AsanaTask[]> {
    return this.getAll(`/tasks/${taskGid}/subtasks`, { opt_fields: TASK_FIELDS });
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
