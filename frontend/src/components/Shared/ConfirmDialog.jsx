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
        <AlertDialogContent w="70%" borderRadius="2xl" justify="center">
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            <HStack spacing={2}>
              <Icon as={meta.icon} color={meta.color} boxSize={5} />
              <Text>{meta.label}</Text>
            </HStack>
          </AlertDialogHeader>

          <AlertDialogBody textAlign="center">
            Are you sure you want to <b>{action}</b>?
          </AlertDialogBody>

          <AlertDialogFooter justifyContent="center">
            <HStack spacing={4}>
              <Button borderRadius="2xl" ref={cancelRef} onClick={onClose}>
                No
              </Button>
              <Button
                borderRadius="2xl"
                colorScheme={meta.color.split(".")[0]}
                onClick={onConfirm}
              >
                Yes, Confirm
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
