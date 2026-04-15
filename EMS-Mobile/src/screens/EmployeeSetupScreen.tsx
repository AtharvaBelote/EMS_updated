import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  Snackbar,
  HelperText,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db, auth } from "../config/firebase";
import { User } from "../types";

export default function EmployeeSetupScreen() {
  const navigation = useNavigation();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSetPassword = async () => {
    // Validation
    if (!employeeId || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Check if employee exists in the employees collection
      const employeeQuery = query(
        collection(db, "employees"),
        where("employeeId", "==", employeeId),
      );
      const employeeSnapshot = await getDocs(employeeQuery);

      if (employeeSnapshot.empty) {
        throw new Error(
          "Employee ID not found. Please contact your administrator.",
        );
      }

      const employeeDoc = employeeSnapshot.docs[0];
      const employeeData = employeeDoc.data();

      // Check if user account already exists
      const userQuery = query(
        collection(db, "users"),
        where("employeeId", "==", employeeId),
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        throw new Error(
          "Account already exists for this Employee ID. Please login instead.",
        );
      }

      // Create Firebase auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        employeeData.email,
        password,
      );

      // Update Firebase profile
      await updateProfile(userCredential.user, {
        displayName: employeeData.fullName,
      });

      // Create user document in Firestore
      const userData: User = {
        uid: userCredential.user.uid,
        userId: employeeId,
        email: employeeData.email,
        role: "employee",
        employeeId: employeeId,
        displayName: employeeData.fullName,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      await setDoc(doc(db, "users", userCredential.user.uid), userData);

      setSuccess("Password set successfully! Redirecting to login...");

      // Clear form
      setEmployeeId("");
      setPassword("");
      setConfirmPassword("");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigation.navigate("Login" as never);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              Set Your Password
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Enter your Employee ID and create a password
            </Text>
          </View>

          <View style={styles.form}>
            {error && (
              <HelperText
                type="error"
                visible={!!error}
                style={styles.errorMessage}
              >
                {error}
              </HelperText>
            )}

            <TextInput
              label="Employee ID"
              value={employeeId}
              onChangeText={setEmployeeId}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              disabled={loading}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
              disabled={loading}
            />

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? "eye-off" : "eye"}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
              style={styles.input}
              disabled={loading}
            />

            <Button
              mode="contained"
              onPress={handleSetPassword}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Set Password
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate("Login" as never)}
              disabled={loading}
              style={styles.secondaryButton}
            >
              Back to Login
            </Button>

            <Text variant="bodySmall" style={styles.helpText}>
              Password must be at least 6 characters long
            </Text>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess("")}
        duration={2000}
      >
        {success}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontWeight: "bold",
    color: "#2196f3",
    marginBottom: 8,
  },
  subtitle: {
    color: "#666",
  },
  form: {
    width: "100%",
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 6,
  },
  helpText: {
    textAlign: "center",
    marginTop: 16,
    color: "#666",
  },
  errorMessage: {
    marginBottom: 12,
  },
});
