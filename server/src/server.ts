// server side
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import crypto from 'crypto';

// receive HTTP request by app.
// app calls post and get methods.
const app = express();
app.use(cors());
app.use(express.json());

/* SECRET */
const MESHY_API = 'https://api.meshy.ai/openapi/v2';
const MESHY_KEY = process.env.MESHY_API_KEY!;
if (!MESHY_KEY) throw new Error('MESHY_API_KEY is not set');

/* JOBS */
type JobStatus = 'queued' | 'running' | 'ready' | 'error';
type Job = { id: string; status: JobStatus; url?: string; error?: string; taskId?: string };
const jobs = new Map<string, Job>();

/* POST & GET HANDLER*/
// POST: if niantic throw 'post', this section execute. 
app.post('/api/3Dcontents', async (req, res) => {
	// TODO: hard cording. register jobs.
	const prompt: string = (req.body?.prompt || '魅力的な形をした本棚').toString();
	const jobId = crypto.randomUUID();
	jobs.set(jobId, { id: jobId, status: 'queued' });

	// generate 3D and set url.
	(async () => {
		try {
			jobs.set(jobId, { id: jobId, status: 'running' });

			// preview generate
			const previewId = await startTextTo3D(prompt);
			await waitForSuccess(previewId);

			// add texture
			const refineId = await startTextTo3DRefine(previewId, {
				enable_pbr: true,
			});
			const glbUrl = await waitForGlbUrl(refineId);
			
			jobs.set(jobId, { id: jobId, status: 'ready', url: glbUrl, taskId: refineId });
		} catch (e: any) {
			jobs.set(jobId, { id: jobId, status: 'error', error: String(e?.message || e) });
		}
	})();
	res.json({ jobId });
});

// GET: if niantic throw 'get', this section execute. we can check job status.
// if generate will be success, status change to 'ready'.
app.get('/api/jobs/:id', (req, res) => {
	const job = jobs.get(req.params.id);
	if (!job) return res.status(404).json({ error: 'not_found' });
	res.json(job);
});

/* UTILS */
// generate3D: The result property of the response contains the task id of the newly created Text to 3D task.
async function startTextTo3D(prompt: string): Promise<string> {
	const { data } = await axios.post<{ result: string }>(
		`${MESHY_API}/text-to-3d`,
		{
			mode: 'preview',
			prompt,
			art_style: 'realistic',
			should_remesh: true
		},
		{ headers: { Authorization: `Bearer ${MESHY_KEY}` } }
	);
	if (!data?.result) throw new Error('No task id in response');
	return data.result; // ex: "018a21...f578"
}

// refine object
// opt->
// enable_pbr: generate PBRmap too.
// texture_prompt: "walnut wood shelves, brass accents"
// texture_image_url: When you want to guide users using images.
async function startTextTo3DRefine(previewTaskId: string, opts?: {
	enable_pbr?: boolean;
	texture_prompt?: string;
	texture_image_url?: string;
}): Promise<string> {
	const { data } = await axios.post<{ result: string }>(
		`${MESHY_API}/text-to-3d`,
		{
			mode: 'refine',
			preview_task_id: previewTaskId,
			enable_pbr: opts?.enable_pbr ?? true,
			texture_prompt: opts?.texture_prompt,
			texture_image_url: opts?.texture_image_url
		},
		{ headers: { Authorization: `Bearer ${MESHY_KEY}` } }
	);
	if (!data?.result) throw new Error('No refine task id');
	return data.result;
}

// wait & get glbUrl: 
async function waitForGlbUrl(taskId: string, intervalMs = 5000, timeoutMs = 10 * 60_000): Promise<string> {
	const t0 = Date.now();
	for (; ;) {
		if (Date.now() - t0 > timeoutMs) throw new Error('timeout');

		// meshy action status
		const { data } = await axios.get<{
			status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
			model_urls?: { glb?: string };
			task_error?: { message?: string };
		}>(`${MESHY_API}/text-to-3d/${taskId}`, {
			headers: { Authorization: `Bearer ${MESHY_KEY}` }
		});

		if (data.status === 'SUCCEEDED') {
			const glb = data.model_urls?.glb;
			if (!glb) throw new Error('No GLB URL in task');
			return glb;
		}
		if (data.status === 'FAILED') {
			throw new Error(data.task_error?.message || 'generation failed');
		}

		// wait
		await new Promise(r => setTimeout(r, intervalMs));
	}
}

// wait only
async function waitForSuccess(taskId: string, intervalMs = 5000, timeoutMs = 10 * 60_000): Promise<void> {
	const t0 = Date.now();
	for (; ;) {
		if (Date.now() - t0 > timeoutMs) throw new Error('timeout');
		const { data } = await axios.get<{ status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED'; task_error?: { message?: string } }>(
			`${MESHY_API}/text-to-3d/${taskId}`,
			{ headers: { Authorization: `Bearer ${MESHY_KEY}` } }
		);
		if (data.status === 'SUCCEEDED') return;
		if (data.status === 'FAILED') throw new Error(data.task_error?.message || 'preview failed');
		await new Promise(r => setTimeout(r, intervalMs));
	}
}


/* ----------------------------BOOT----------------------------------- */
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => console.log(`Server listening on http://${host}:${port}`));