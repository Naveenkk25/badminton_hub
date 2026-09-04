"use client";

import React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

interface CreateOrganizerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createOrganizerSchema = z.object({
  name: z.string().min(1, "Organizer name is required"),
  contactNumber: z.string().min(10, "Valid contact number is required")
});

export function CreateOrganizerDrawer({ open, onOpenChange }: CreateOrganizerDrawerProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(createOrganizerSchema)
  });
  
  const [createdPassword, setCreatedPassword] = React.useState<string | null>(null);

  const queryClient = useQueryClient();

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setCreatedPassword(null);
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: any) => {
    try {
      const response = await api.post("/Organizers", {
        name: data.name,
        contactNumber: data.contactNumber
      });
      toast.success("Organizer added successfully!");
      await queryClient.invalidateQueries({ queryKey: ["organizers"] });
      await queryClient.refetchQueries({ queryKey: ["organizers"] });
      
      if (response.data && response.data.temporaryPassword) {
        setCreatedPassword(response.data.temporaryPassword);
      } else {
        onOpenChange(false);
      }
    } catch (error: any) {
      const errData = error?.response?.data;
      let errMsg = "Failed to add organizer. Please check the details.";
      if (errData?.error) errMsg = errData.error;
      else if (errData?.errors) errMsg = (Object.values(errData.errors)[0] as string[])?.[0] || errMsg;
      else if (errData?.title) errMsg = errData.title;
      toast.error(errMsg);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => {
      if (!val) {
        setCreatedPassword(null);
        queryClient.invalidateQueries({ queryKey: ["organizers"] });
        queryClient.refetchQueries({ queryKey: ["organizers"] });
      }
      onOpenChange(val);
    }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-heading">Add Organizer</SheetTitle>
          <SheetDescription>
            Register a new organizer or club to manage badminton events.
          </SheetDescription>
        </SheetHeader>

        {createdPassword ? (
          <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-court-blue/10 rounded-xl border border-court-blue/20">
            <div className="bg-court-blue text-white p-3 rounded-full mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h3 className="text-lg font-bold text-foreground text-center">Organizer Created Successfully</h3>
            <p className="text-sm text-center text-muted-foreground">
              Please share this temporary password with the organizer. They will be prompted to change it on their first login.
            </p>
            <div className="w-full bg-background border border-border p-4 rounded-lg flex items-center justify-between">
              <code className="text-lg font-mono font-bold text-court-blue">{createdPassword}</code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  navigator.clipboard.writeText(createdPassword);
                  toast.success("Password copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
            <Button 
              className="w-full mt-4 bg-court-blue hover:bg-court-blue-light text-white" 
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["organizers"] });
                queryClient.refetchQueries({ queryKey: ["organizers"] });
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Organizer / Club Name</Label>
              <Input {...register("name")} placeholder="e.g. Apex Badminton Club" />
              {errors.name && <span className="text-xs text-match-red">{errors.name.message?.toString()}</span>}
            </div>

            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input {...register("contactNumber")} placeholder="e.g. 1234567890" />
              {errors.contactNumber && <span className="text-xs text-match-red">{errors.contactNumber.message?.toString()}</span>}
            </div>



            <div className="pt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-court-blue hover:bg-court-blue-light text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Organizer
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
