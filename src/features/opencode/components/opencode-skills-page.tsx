"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, CopyIcon, Upload } from "lucide-react"
import { toast } from "sonner"
import { type ChangeEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingState } from "@/components/ui/loading-state/loading-state"
import { PageHeader } from "@/components/ui/page-header/page-header"
import { SectionCard } from "@/components/ui/section-card/section-card"
import { SectionCardContent } from "@/components/ui/section-card/section-card-content"
import { SectionCardHeader } from "@/components/ui/section-card/section-card-header"
import { OpencodeSkillListItem } from "@/features/opencode/components/opencode-skill-list-item"
import { OpencodeSkillUploadProgress } from "@/features/opencode/components/opencode-skill-upload-progress"
import { useProjectScope } from "@/features/projects/context/project-scope-context"
import { uploadSkillFiles } from "@/lib/api/upload-skill-files"
import { useTRPC } from "@/lib/trpc/client"

type UploadState = {
  isUploading: boolean
  progress: number
  message: string | null
}

export const OpencodeSkillsPage = () => {
  const { organizationSlug, projectSlug } = useProjectScope()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pendingFileList, setPendingFileList] = useState<FileList | null>(null)
  const [overwriteFolderName, setOverwriteFolderName] = useState<string | null>(
    null,
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    message: null,
  })

  const skillsQuery = useQuery(
    trpc.opencode.listSkills.queryOptions({
      organizationSlug,
      projectSlug,
    }),
  )

  const handleCopyPath = async () => {
    if (!skillsQuery.data?.skillsDirectory) return
    await navigator.clipboard.writeText(skillsQuery.data.skillsDirectory)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const performUpload = async (files: FileList | File[]) => {
    const fileCount = files.length

    setUploadState({
      isUploading: true,
      progress: 0,
      message: `Uploading ${fileCount} file${fileCount > 1 ? "s" : ""}...`,
    })

    let result
    try {
      result = await uploadSkillFiles({
        organizationSlug,
        projectSlug,
        files,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed"
      setUploadState({
        isUploading: false,
        progress: 0,
        message,
      })
      toast.error(message)
      return
    }

    const uploadedCount = result.uploaded.length
    const errorCount = result.errors.length

    if (errorCount > 0) {
      const errorMessage = `Uploaded ${uploadedCount}, ${errorCount} failed.`
      setUploadState({
        isUploading: false,
        progress: 100,
        message: errorMessage,
      })
      toast.warning(errorMessage)
      return
    }

    setUploadState({
      isUploading: false,
      progress: 100,
      message: `Uploaded "${result.skillName}".`,
    })

    toast.success(`Skill "${result.skillName}" added successfully.`)

    await queryClient.invalidateQueries(
      trpc.opencode.listSkills.queryFilter({
        organizationSlug,
        projectSlug,
      }),
    )
  }

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setPendingFileList(null)
    setOverwriteFolderName(null)
  }

  const handleUploadFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files

    if (!files || files.length === 0) return

    const firstFile = files[0]
    const fullPath = (
      firstFile as File & { webkitRelativePath?: string }
    ).webkitRelativePath

    if (!fullPath) {
      toast.error("Please select a folder, not individual files.")
      resetFileInput()
      return
    }

    const folderName = fullPath.split("/")[0]

    if (!folderName) {
      toast.error("Could not determine folder name from upload.")
      resetFileInput()
      return
    }

    const existingSkills = skillsQuery.data?.skills ?? []
    const isDuplicate = existingSkills.some(
      (skill) => skill.directoryName === folderName,
    )

    if (isDuplicate) {
      setPendingFileList(files)
      setOverwriteFolderName(folderName)
      setDialogOpen(true)
      return
    }

    performUpload(files).finally(() => resetFileInput())
  }

  const handleDialogCancel = () => {
    setDialogOpen(false)
    resetFileInput()
  }

  const handleDialogOverwrite = () => {
    setDialogOpen(false)

    if (!pendingFileList) return

    performUpload(pendingFileList).finally(() => resetFileInput())
  }

  if (skillsQuery.isLoading) {
    return <LoadingState label="Loading OpenCode skills..." />
  }

  if (!skillsQuery.data) {
    return <LoadingState label="OpenCode skills could not be loaded." />
  }

  const { skillsDirectory, skills } = skillsQuery.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            OpenCode Skills
          </h1>
          <p className="text-sm text-muted-foreground">
            Reusable agent behavior definitions discovered at runtime.
          </p>
        </div>
      </PageHeader>

      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Skills directory
            </span>
            <span className="text-xs text-muted-foreground">
              Upload a skill folder or copy the path below
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              // @ts-expect-error webkitdirectory is not in TypeScript types but supported by browsers
              webkitdirectory=""
              className="hidden"
              onChange={handleUploadFiles}
              disabled={uploadState.isUploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState.isUploading}
            >
              <Upload className="mr-1.5 size-3.5" />
              Upload skill folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPath}
              className="gap-2"
            >
              {copied ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy path"}
            </Button>
          </div>
        </SectionCardHeader>
        <SectionCardContent>
          <code className="text-xs text-muted-foreground break-all">
            {skillsDirectory}
          </code>
        </SectionCardContent>
      </SectionCard>

      <OpencodeSkillUploadProgress
        isUploading={uploadState.isUploading}
        progress={uploadState.progress}
        message={uploadState.message}
      />

      <SectionCard>
        <SectionCardHeader>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Available skills
            </span>
            <span className="text-xs text-muted-foreground">
              {skills.length === 0
                ? "No skills found — upload a skill folder or add one to the directory above"
                : `${skills.length} skill${skills.length === 1 ? "" : "s"} discovered`}
            </span>
          </div>
        </SectionCardHeader>
        <SectionCardContent>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No skills found. Upload a skill folder and refresh to see it here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {skills.map((skill) => (
                <OpencodeSkillListItem key={skill.name} skill={skill} />
              ))}
            </ul>
          )}
        </SectionCardContent>
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overwrite existing skill?</DialogTitle>
            <DialogDescription>
              A skill folder named &ldquo;{overwriteFolderName}&rdquo; already
              exists. Uploading will replace all files in this folder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogCancel}>
              Cancel
            </Button>
            <Button onClick={handleDialogOverwrite}>Overwrite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
