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
import { UserDto } from "@/lib/types";

interface EditPlayerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: UserDto | null;
  onSubmit: (data: any) => Promise<void>;
}

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  mobileNumber: z.string().min(10, "Valid mobile number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

export function EditPlayerDrawer({ open, onOpenChange, player, onSubmit }: EditPlayerDrawerProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm({
    resolver: zodResolver(formSchema)
  });

  useEffect(() => {
    if (open && player) {
      setValue("fullName", player.fullName);
      setValue("mobileNumber", player.phoneNumber);
      setValue("email", player.email || "");
    }
  }, [open, player, setValue]);

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
    reset();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-md mx-auto">
        <DrawerHeader>
          <DrawerTitle>Edit Player Details</DrawerTitle>
          <DrawerDescription>
            Update profile information for {player?.fullName}.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input {...register("fullName")} />
            {errors.fullName && <span className="text-xs text-match-red">{errors.fullName.message?.toString()}</span>}
          </div>

          <div className="space-y-2">
            <Label>Mobile Number</Label>
            <Input {...register("mobileNumber")} />
            {errors.mobileNumber && <span className="text-xs text-match-red">{errors.mobileNumber.message?.toString()}</span>}
          </div>

          <div className="space-y-2">
            <Label>Email (Optional)</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <span className="text-xs text-match-red">{errors.email.message?.toString()}</span>}
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
