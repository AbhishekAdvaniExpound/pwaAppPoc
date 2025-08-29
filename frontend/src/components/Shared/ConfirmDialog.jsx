import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  HStack,
  Icon,
  Text,
} from "@chakra-ui/react";
import { useRef } from "react";
import { CheckCircleIcon, CloseIcon, EditIcon } from "@chakra-ui/icons";

export default function ConfirmDialog({ isOpen, onClose, action, onConfirm }) {
  const cancelRef = useRef();

  // Map actions to icons + colors
  const actionMeta = {
    Save: {
      label: "Save Changes",
      icon: EditIcon,
      color: "blue.500",
    },
    Approve: {
      label: "Approve Item",
      icon: CheckCircleIcon,
      color: "green.500",
    },
    Reject: {
      label: "Reject Item",
      icon: CloseIcon,
      color: "red.500",
    },
  };

  const meta = actionMeta[action] || {
    label: "Confirm Action",
    icon: EditIcon,
    color: "gray.500",
  };

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            <HStack spacing={2}>
              <Icon as={meta.icon} color={meta.color} boxSize={5} />
              <Text>{meta.label}</Text>
            </HStack>
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure you want to <b>{action}</b>?
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              No
            </Button>
            <Button
              colorScheme={meta.color.split(".")[0]}
              onClick={onConfirm}
              ml={3}
            >
              Yes, Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
