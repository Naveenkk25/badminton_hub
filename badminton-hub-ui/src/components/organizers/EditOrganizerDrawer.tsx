"use client";

import React, { useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { OrganizerDto } from "@/lib/types";

interface EditOrganizerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizer: OrganizerDto | null;
  onSubmit: (data: any) => Promise<void>;
}

const formSchema = z.object({
  name: z.string().min(2, "Club/Organizer name must be at least 2 characters"),
  contactNumber: z.string().min(10, "Valid contact number is required"),
});

export function EditOrganizerDrawer({ open, onOpenChange, organizer, onSubmit }: EditOrganizerDrawerProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm({
    resolver: zodResolver(formSchema)
  });

  useEffect(() => {
    if (open && organizer) {
      setValue("name", organizer.name);
      setValue("contactNumber", organizer.contactNumber);
    }
  }, [open, organizer, setValue]);

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
    reset();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-md mx-auto">
        <DrawerHeader>
          <DrawerTitle>Edit Organizer Details</DrawerTitle>
          <DrawerDescription>
            Update details for {organizer?.name}.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Club / Organizer Name</Label>
            <Input {...register("name")} />
            {errors.name && <span className="text-xs text-match-red">{errors.name.message?.toString()}</span>}
          </div>

          <div className="space-y-2">
            <Label>Contact Number</Label>
            <Input {...register("contactNumber")} />
            {errors.contactNumber && <span className="text-xs text-match-red">{errors.contactNumber.message?.toString()}</span>}
          </div>

          <DrawerFooter className="px-0 pt-6">
            <Button type="submit" disabled={isSubmitting} className="bg-court-green hover:bg-court-green-light">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
