/**
 * TanStack Query hooks for Huly tracker projects.
 *
 * useProjects: query for all projects.
 * useProjectDetail: query for a single project.
 * useComponents / useMilestones: project-scoped queries.
 * useLabels: issue-scoped label query.
 * useCreateProject / useUpdateProject / useDeleteProject: mutation hooks.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import type { Ref, Doc, Space, WithLookup } from '@hcengineering/core'
import type { Project } from '@hcengineering/tracker'

import {
  getProjects,
  getProjectDetail,
  getComponents,
  getMilestones,
  getLabels,
  getProjectLabels,
  createProject,
  updateProject,
  deleteProject,
  type ComponentItem,
  type MilestoneItem,
  type LabelItem,
} from '@/repositories/tracker'
import { getClient } from '@/client'
import { useWebSocketStore } from '@/store/websocket'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECTS_STALE_TIME = 5 * 60_000   // 5 minutes
const PROJECTS_GC_TIME = 30 * 60_000     // 30 minutes
const DETAIL_STALE_TIME = 60_000         // 1 minute
const COMPONENTS_STALE_TIME = 5 * 60_000
const MILESTONES_STALE_TIME = 5 * 60_000
const LABELS_STALE_TIME = 5 * 60_000

// ---------------------------------------------------------------------------
// useProjects
// ---------------------------------------------------------------------------

export function useProjects(): UseQueryResult<Project[], Error> {
  return useQuery<Project[], Error>({
    queryKey: ['tracker', 'projects'],
    queryFn: getProjects,
    staleTime: PROJECTS_STALE_TIME,
    gcTime: PROJECTS_GC_TIME,
    enabled: getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useProjectDetail
// ---------------------------------------------------------------------------

export function useProjectDetail(
  projectId: string | undefined
): UseQueryResult<WithLookup<Project> | undefined, Error> {
  const wsConnected = useWebSocketStore((s) => s.status === 'connected')

  return useQuery<WithLookup<Project> | undefined, Error>({
    queryKey: ['tracker', 'project', projectId],
    queryFn: () => getProjectDetail(projectId as Ref<Space>),
    staleTime: wsConnected ? PROJECTS_STALE_TIME : DETAIL_STALE_TIME,
    gcTime: PROJECTS_GC_TIME,
    enabled: projectId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useComponents
// ---------------------------------------------------------------------------

export function useComponents(
  projectId: string | undefined
): UseQueryResult<ComponentItem[], Error> {
  return useQuery<ComponentItem[], Error>({
    queryKey: ['tracker', 'components', projectId],
    queryFn: () => getComponents(projectId as Ref<Space>),
    staleTime: COMPONENTS_STALE_TIME,
    gcTime: PROJECTS_GC_TIME,
    enabled: projectId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useMilestones
// ---------------------------------------------------------------------------

export function useMilestones(
  projectId: string | undefined
): UseQueryResult<MilestoneItem[], Error> {
  return useQuery<MilestoneItem[], Error>({
    queryKey: ['tracker', 'milestones', projectId],
    queryFn: () => getMilestones(projectId as Ref<Space>),
    staleTime: MILESTONES_STALE_TIME,
    gcTime: PROJECTS_GC_TIME,
    enabled: projectId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useLabels (for a specific issue)
// ---------------------------------------------------------------------------

export function useLabels(
  issueId: string | undefined
): UseQueryResult<LabelItem[], Error> {
  return useQuery<LabelItem[], Error>({
    queryKey: ['tracker', 'labels', issueId],
    queryFn: () => getLabels(issueId!),
    staleTime: LABELS_STALE_TIME,
    gcTime: PROJECTS_GC_TIME,
    enabled: issueId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useProjectLabels (all labels used in a project)
// ---------------------------------------------------------------------------

export function useProjectLabels(
  projectId: string | undefined
): UseQueryResult<LabelItem[], Error> {
  return useQuery<LabelItem[], Error>({
    queryKey: ['tracker', 'projectLabels', projectId],
    queryFn: () => getProjectLabels(projectId as Ref<Space>),
    staleTime: LABELS_STALE_TIME,
    gcTime: PROJECTS_GC_TIME,
    enabled: projectId !== undefined && getClient() !== null,
  })
}

// ---------------------------------------------------------------------------
// useCreateProject
// ---------------------------------------------------------------------------

export interface CreateProjectDraft {
  name: string
  identifier: string
  description?: string
  defaultIssueStatus?: string
  defaultAssignee?: Ref<Doc> | null
}

export function useCreateProject(): UseMutationResult<Ref<Doc>, Error, CreateProjectDraft> {
  const queryClient = useQueryClient()

  return useMutation<Ref<Doc>, Error, CreateProjectDraft>({
    mutationFn: async (draft) => {
      const data: Record<string, unknown> = {
        name: draft.name,
        identifier: draft.identifier,
      }
      if (draft.description) data.description = draft.description
      if (draft.defaultIssueStatus) data.defaultIssueStatus = draft.defaultIssueStatus
      if (draft.defaultAssignee) data.defaultAssignee = draft.defaultAssignee
      return await createProject(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'projects'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateProject
// ---------------------------------------------------------------------------

export interface UpdateProjectParams {
  projectId: Ref<Space>
  update: Record<string, unknown>
}

export function useUpdateProject(): UseMutationResult<void, Error, UpdateProjectParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateProjectParams>({
    mutationFn: async (params) => {
      await updateProject(params.projectId, params.update)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'project', variables.projectId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'projects'],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// useDeleteProject
// ---------------------------------------------------------------------------

export interface DeleteProjectParams {
  projectId: Ref<Space>
}

export function useDeleteProject(): UseMutationResult<void, Error, DeleteProjectParams> {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteProjectParams>({
    mutationFn: async (params) => {
      await deleteProject(params.projectId)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tracker', 'projects'],
      })
      queryClient.removeQueries({
        queryKey: ['tracker', 'project', variables.projectId],
      })
    },
  })
}
