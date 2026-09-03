"use client";

import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

interface ChangeCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerName: string;
  currentCategory: string;
  onSubmit: (category: string) => Promise<void>;
}

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
});

export function ChangeCategoryModal({
  open,
  onOpenChange,
  playerName,
  currentCategory,
  onSubmit
}: ChangeCategoryModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm({
    resolver: zodResolver(formSchema)
  });

  useEffect(() => {
    if (open) {
      setValue("category", currentCategory);
    }
  }, [open, currentCategory, setValue]);

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data.category);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Player Category</DialogTitle>
          <DialogDescription>
            Update the skill category for {playerName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>New Category</Label>
            <select 
              {...register("category")} 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Advanced">Advanced</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Plus">Plus</option>
            </select>
            {errors.category && <span className="text-xs text-match-red">{errors.category.message?.toString()}</span>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-court-blue hover:bg-court-blue-light text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
